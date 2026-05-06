<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class ContentBlockApiController extends AbstractController
{
    public function __construct(
        private readonly Connection $db,
    ) {
    }

    // GET /s/content-blocks/list
    public function listAction(Request $request): JsonResponse
    {
        if (!$request->isXmlHttpRequest()) {
            throw $this->createAccessDeniedException();
        }

        try {
            $rows = $this->db->fetchAllAssociative(
                'SELECT id, name, icon, category, html_content, thumbnail FROM content_blocks WHERE is_published = 1 ORDER BY name ASC'
            );

            $blocks = array_map(fn($r) => [
                'id'          => (int) $r['id'],
                'name'        => $r['name'],
                'icon'        => $r['icon'] ?? null,
                'category'    => $r['category'] ?? 'General',
                'htmlContent' => $r['html_content'],
                'thumbnail'   => $r['thumbnail'] ?? null,
            ], $rows);

            return new JsonResponse(['blocks' => $blocks]);
        } catch (\Throwable $e) {
            return new JsonResponse(['error' => 'DB error: ' . $e->getMessage()], 500);
        }
    }

    // POST /s/content-blocks/save
    public function saveAction(Request $request): JsonResponse
    {
        if (!$request->isXmlHttpRequest() || 'POST' !== $request->getMethod()) {
            throw $this->createAccessDeniedException();
        }

        $name        = trim((string) $request->request->get('name', ''));
        $htmlContent = trim((string) $request->request->get('htmlContent', ''));
        $icon        = trim((string) $request->request->get('icon', ''));

        if ('' === $name) {
            return new JsonResponse(['error' => 'Block name is required.'], 400);
        }
        if ('' === $htmlContent) {
            return new JsonResponse(['error' => 'No HTML content to save.'], 400);
        }

        try {
            $now = (new \DateTime())->format('Y-m-d H:i:s');

            $this->db->insert('content_blocks', [
                'name'         => $name,
                'icon'         => $icon !== '' ? $icon : null,
                'html_content' => $htmlContent,
                'category'     => 'General',
                'is_published' => 1,
                'date_added'   => $now,
            ]);

            $id = (int) $this->db->lastInsertId();

            return new JsonResponse([
                'id'          => $id,
                'name'        => $name,
                'icon'        => $icon !== '' ? $icon : null,
                'htmlContent' => $htmlContent,
                'category'    => 'General',
                'thumbnail'   => null,
            ]);
        } catch (\Throwable $e) {
            return new JsonResponse(['error' => 'Save failed: ' . $e->getMessage()], 500);
        }
    }
}
