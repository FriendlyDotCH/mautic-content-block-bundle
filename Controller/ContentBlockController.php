<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Twig\Environment;

class ContentBlockController extends AbstractController
{
    public function __construct(
        private readonly Connection $db,
        private readonly Environment $twig,
    ) {
    }

    public function indexAction(Request $request, int $page = 1): Response
    {
        $limit  = 30;
        $offset = ($page - 1) * $limit;

        $items = $this->db->fetchAllAssociative(
            'SELECT id, name, icon, category, is_published, date_added, html_content FROM content_blocks ORDER BY name ASC LIMIT ? OFFSET ?',
            [$limit, $offset],
            [\PDO::PARAM_INT, \PDO::PARAM_INT]
        );

        // Render the proper Twig template — this inherits @MauticCore/Default/content.html.twig
        // which provides the native page header, search bar hooks, and Mautic chrome.
        // When rendered inside an XHR request, content.html.twig produces just the inner blocks.
        $html = $this->twig->render('@MauticContentBlock/ContentBlock/index.html.twig', [
            'items' => $items,
        ]);

        $route = $this->generateUrl('mautic_contentblock_index');

        if ($request->isXmlHttpRequest()) {
            return new JsonResponse([
                'newContent'    => $html,
                'route'         => $route,
                'mauticContent' => 'contentBlock',
                'flashes'       => '',
                'notifications' => '',
            ]);
        }

        // Direct URL hit — redirect to dashboard (Mautic SPA pages don't work standalone)
        return new Response('<!DOCTYPE html><html><head><meta charset="UTF-8">
            <script>window.location.replace("/s/dashboard");</script>
        </head><body>Redirecting...</body></html>');
    }

    public function toggleAction(Request $request, int $objectId): JsonResponse
    {
        $row = $this->db->fetchAssociative('SELECT is_published FROM content_blocks WHERE id = ?', [$objectId]);
        if ($row) {
            $this->db->update('content_blocks', ['is_published' => $row['is_published'] ? 0 : 1], ['id' => $objectId]);
        }
        return new JsonResponse(['success' => true]);
    }

    public function editAction(Request $request, int $objectId): JsonResponse
    {
        $data = [];
        $name = trim((string) $request->request->get('name', ''));
        if ($name !== '') $data['name'] = $name;
        $category = trim((string) $request->request->get('category', ''));
        if ($category !== '') $data['category'] = $category;
        $icon = $request->request->get('icon');
        if ($icon !== null) $data['icon'] = trim((string) $icon) ?: null;
        $htmlContent = $request->request->get('htmlContent');
        if ($htmlContent !== null) $data['html_content'] = (string) $htmlContent;
        if (!empty($data)) {
            $this->db->update('content_blocks', $data, ['id' => $objectId]);
        }
        return new JsonResponse(['success' => true]);
    }

    public function deleteAction(Request $request, int $objectId): JsonResponse
    {
        $this->db->delete('content_blocks', ['id' => $objectId]);
        return new JsonResponse(['success' => true]);
    }
}
