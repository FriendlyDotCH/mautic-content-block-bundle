<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Controller;

use Doctrine\DBAL\Connection;
use JMS\Serializer\SerializerInterface;
use Mautic\CoreBundle\Helper\InputHelper;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Csrf\CsrfToken;
use Symfony\Component\Security\Csrf\CsrfTokenManagerInterface;

class ContentBlockApiController extends AbstractController
{
    private const ALLOWED_CATEGORIES = ['general', 'header', 'footer', 'signature', 'legal', 'promotional'];

    public function __construct(
        private readonly Connection $db,
        private readonly CsrfTokenManagerInterface $csrfTokenManager,
        private readonly LoggerInterface $logger,
        private readonly SerializerInterface $serializer,
    ) {
    }

    public function listAction(Request $request): JsonResponse
    {
        if (!$request->isXmlHttpRequest()) {
            throw $this->createAccessDeniedException();
        }

        $table = MAUTIC_TABLE_PREFIX.'friendly_content_blocks';

        try {
            $rows = $this->db->fetchAllAssociative(
                "SELECT id, name, icon, cb_category, html_content, thumbnail FROM `{$table}` WHERE is_published = 1 ORDER BY name ASC"
            );

            $blocks = array_map(fn ($r) => [
                'id'          => (int) $r['id'],
                'name'        => $r['name'],
                'icon'        => $r['icon'] ?? null,
                'category'    => $r['cb_category'] ?? 'general',
                'htmlContent' => $r['html_content'],
                'thumbnail'   => $r['thumbnail'] ?? null,
            ], $rows);

            $json = $this->serializer->serialize(['blocks' => $blocks], 'json');

            return $this->sendJsonResponse($json);
        } catch (\Throwable $e) {
            $this->logger->error('ContentBlock list failed: '.$e->getMessage());

            return new JsonResponse(['error' => 'An error occurred.'], 500);
        }
    }

    public function saveAction(Request $request): JsonResponse
    {
        if (!$request->isXmlHttpRequest() || 'POST' !== $request->getMethod()) {
            throw $this->createAccessDeniedException();
        }

        $csrfToken = (string) $request->headers->get('X-CSRF-Token', '');
        if (!$this->csrfTokenManager->isTokenValid(new CsrfToken('mautic_ajax_post', $csrfToken))) {
            return new JsonResponse(['error' => 'Invalid CSRF token.'], 403);
        }

        $name        = trim(InputHelper::string((string) $request->request->get('name', '')));
        $htmlContent = trim(InputHelper::html((string) $request->request->get('htmlContent', '')));
        $category    = strtolower(trim(InputHelper::string((string) $request->request->get('category', 'general'))));
        $iconRaw     = (string) $request->request->get('icon', '');
        $icon        = mb_substr(strip_tags($iconRaw), 0, 20) ?: null;

        if ('' === $name) {
            return new JsonResponse(['error' => 'Block name is required.'], 400);
        }
        if (mb_strlen($name) > 191) {
            return new JsonResponse(['error' => 'Name must be 191 characters or fewer.'], 400);
        }
        if ('' === $htmlContent) {
            return new JsonResponse(['error' => 'No HTML content to save.'], 400);
        }
        if (!in_array($category, self::ALLOWED_CATEGORIES, true)) {
            $category = 'general';
        }

        $table = MAUTIC_TABLE_PREFIX.'friendly_content_blocks';

        try {
            $this->db->insert($table, [
                'name'         => $name,
                'icon'         => $icon,
                'html_content' => $htmlContent,
                'cb_category'  => $category,
                'is_published' => 1,
                'date_added'   => (new \DateTime())->format('Y-m-d H:i:s'),
            ]);

            $id = (int) $this->db->lastInsertId();

            return new JsonResponse([
                'id'          => $id,
                'name'        => $name,
                'icon'        => $icon,
                'htmlContent' => $htmlContent,
                'category'    => $category,
                'thumbnail'   => null,
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('ContentBlock save failed: '.$e->getMessage());

            return new JsonResponse(['error' => 'An error occurred.'], 500);
        }
    }
}
