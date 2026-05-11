<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Controller;

use Doctrine\DBAL\Connection;
use Mautic\CoreBundle\Factory\PageHelperFactoryInterface;
use Mautic\CoreBundle\Helper\InputHelper;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ContentBlockController extends AbstractController
{
    private const ALLOWED_CATEGORIES = ['general', 'header', 'footer', 'signature', 'legal', 'promotional'];

    public function __construct(
        private readonly Connection $db,
        private readonly LoggerInterface $logger,
    ) {
    }

    private const ORDER_COLUMNS = ['name' => 'name', 'category' => 'category', 'date_added' => 'date_added', 'id' => 'id'];

    public function indexAction(Request $request, PageHelperFactoryInterface $pageHelperFactory, int $page = 1): Response
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $session = $request->getSession();

        // Search (session key matches Mautic convention)
        if ($request->query->has('search')) {
            $search = trim(InputHelper::string((string) $request->query->get('search', '')));
            $session->set('mautic.contentBlock.filter', $search);
        } else {
            $search = (string) $session->get('mautic.contentBlock.filter', '');
        }

        // Ordering (session keys match what tableheader.html.twig reads)
        if ($request->query->has('orderby')) {
            $orderBy = self::ORDER_COLUMNS[$request->query->get('orderby')] ?? 'name';
            $session->set('mautic.contentBlock.orderby', $orderBy);
        } else {
            $orderBy = (string) $session->get('mautic.contentBlock.orderby', 'name');
            $orderBy = self::ORDER_COLUMNS[$orderBy] ?? 'name';
        }

        if ($request->query->has('orderbydir')) {
            $orderDir = 'desc' === strtolower((string) $request->query->get('orderbydir', 'asc')) ? 'DESC' : 'ASC';
            $session->set('mautic.contentBlock.orderbydir', $orderDir);
        } else {
            $orderDir = 'DESC' === strtoupper((string) $session->get('mautic.contentBlock.orderbydir', 'ASC')) ? 'DESC' : 'ASC';
        }

        $pageHelper = $pageHelperFactory->make('contentBlock', $page);
        $limit      = $pageHelper->getLimit();
        $start      = $pageHelper->getStart();
        $table      = MAUTIC_TABLE_PREFIX.'friendly_content_blocks';

        $where  = '';
        $params = [];
        $types  = [];
        if ('' !== $search) {
            $where  = ' WHERE (`name` LIKE ? OR `category` LIKE ?)';
            $params = ['%'.$search.'%', '%'.$search.'%'];
            $types  = [\PDO::PARAM_STR, \PDO::PARAM_STR];
        }

        $total = (int) $this->db->fetchOne("SELECT COUNT(*) FROM `{$table}`{$where}", $params, $types);
        $items = $this->db->fetchAllAssociative(
            "SELECT id, name, icon, category, is_published, date_added, html_content FROM `{$table}`{$where} ORDER BY `{$orderBy}` {$orderDir} LIMIT ? OFFSET ?",
            array_merge($params, [$limit, $start]),
            array_merge($types, [\PDO::PARAM_INT, \PDO::PARAM_INT])
        );

        $pageHelper->rememberPage($page);

        $route = $this->generateUrl('mautic_contentblock_index');

        $html = $this->renderView('@MauticContentBlock/ContentBlock/index.html.twig', [
            'items'        => $items,
            'page'         => $page,
            'limit'        => $limit,
            'totalItems'   => $total,
            'searchValue'  => $search,
            'currentRoute' => $route,
        ]);

        if ($request->isXmlHttpRequest()) {
            return new JsonResponse([
                'newContent'    => $html,
                'route'         => $route,
                'mauticContent' => 'contentBlock',
                'flashes'       => '',
                'notifications' => '',
            ]);
        }

        return new Response('<!DOCTYPE html><html><head><meta charset="UTF-8">
            <script>window.location.replace("/s/dashboard");</script>
        </head><body>Redirecting...</body></html>');
    }

    public function toggleAction(Request $request, int $objectId): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $table = MAUTIC_TABLE_PREFIX.'friendly_content_blocks';

        try {
            $row = $this->db->fetchAssociative("SELECT is_published FROM `{$table}` WHERE id = ?", [$objectId]);
            if (false === $row) {
                return new JsonResponse(['error' => 'Block not found.'], 404);
            }

            $this->db->update($table, ['is_published' => $row['is_published'] ? 0 : 1], ['id' => $objectId]);

            return new JsonResponse(['success' => true]);
        } catch (\Throwable $e) {
            $this->logger->error('ContentBlock toggle failed: '.$e->getMessage());

            return new JsonResponse(['error' => 'An error occurred.'], 500);
        }
    }

    public function editAction(Request $request, int $objectId): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $table = MAUTIC_TABLE_PREFIX.'friendly_content_blocks';
        $data  = [];

        $name = trim(InputHelper::string((string) $request->request->get('name', '')));
        if ('' !== $name) {
            if (mb_strlen($name) > 191) {
                return new JsonResponse(['error' => 'Name must be 191 characters or fewer.'], 400);
            }
            $data['name'] = $name;
        }

        $category = strtolower(trim(InputHelper::string((string) $request->request->get('category', ''))));
        if ('' !== $category) {
            if (!in_array($category, self::ALLOWED_CATEGORIES, true)) {
                return new JsonResponse(['error' => 'Invalid category.'], 400);
            }
            $data['category'] = $category;
        }

        $iconRaw = $request->request->get('icon');
        if (null !== $iconRaw) {
            $icon         = mb_substr(strip_tags((string) $iconRaw), 0, 20);
            $data['icon'] = '' !== $icon ? $icon : null;
        }

        $htmlContent = $request->request->get('htmlContent');
        if (null !== $htmlContent) {
            $data['html_content'] = InputHelper::html((string) $htmlContent);
        }

        if (empty($data)) {
            return new JsonResponse(['success' => true]);
        }

        try {
            $this->db->update($table, $data, ['id' => $objectId]);

            return new JsonResponse(['success' => true]);
        } catch (\Throwable $e) {
            $this->logger->error('ContentBlock edit failed: '.$e->getMessage());

            return new JsonResponse(['error' => 'An error occurred.'], 500);
        }
    }

    public function editPageAction(Request $request, int $objectId): Response
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $table = MAUTIC_TABLE_PREFIX.'friendly_content_blocks';

        if ($request->isMethod('POST')) {
            $data = [];

            $name = trim(InputHelper::string((string) $request->request->get('name', '')));
            if ('' === $name) {
                $error = 'Name is required.';
            } elseif (mb_strlen($name) > 191) {
                $error = 'Name must be 191 characters or fewer.';
            } else {
                $data['name'] = $name;
            }

            if (!isset($error)) {
                $category         = strtolower(trim(InputHelper::string((string) $request->request->get('category', 'general'))));
                $data['category'] = in_array($category, self::ALLOWED_CATEGORIES, true) ? $category : 'general';

                $iconRaw      = (string) $request->request->get('icon', '');
                $data['icon'] = '' !== $iconRaw ? mb_substr(strip_tags($iconRaw), 0, 20) : null;

                $data['html_content'] = InputHelper::html((string) $request->request->get('htmlContent', ''));

                try {
                    $this->db->update($table, $data, ['id' => $objectId]);
                } catch (\Throwable $e) {
                    $this->logger->error('ContentBlock editPage failed: '.$e->getMessage());
                    $error = 'An error occurred while saving.';
                }
            }

            if (!isset($error)) {
                $redirectUrl = $this->generateUrl('mautic_contentblock_index');
                if ($request->isXmlHttpRequest()) {
                    return new JsonResponse([
                        'redirect'      => $redirectUrl,
                        'flashes'       => '',
                        'notifications' => '',
                    ]);
                }

                return $this->redirect($redirectUrl);
            }

            // Re-render form with error
            $row = $this->db->fetchAssociative(
                "SELECT id, name, icon, category, html_content FROM `{$table}` WHERE id = ?",
                [$objectId]
            ) ?: [];
        } else {
            $row = $this->db->fetchAssociative(
                "SELECT id, name, icon, category, html_content FROM `{$table}` WHERE id = ?",
                [$objectId]
            );

            if (false === $row) {
                throw $this->createNotFoundException('Content block not found.');
            }
        }

        $route = $this->generateUrl('mautic_contentblock_edit_page', ['objectId' => $objectId]);
        $html  = $this->renderView('@MauticContentBlock/ContentBlock/edit.html.twig', [
            'item'         => $row,
            'currentRoute' => $route,
            'error'        => $error ?? null,
        ]);

        if ($request->isXmlHttpRequest()) {
            return new JsonResponse([
                'newContent'    => $html,
                'route'         => $route,
                'mauticContent' => 'contentBlockEdit',
                'flashes'       => '',
                'notifications' => '',
            ]);
        }

        return new Response('<!DOCTYPE html><html><head><meta charset="UTF-8">
            <script>window.location.replace("/s/dashboard");</script>
        </head><body>Redirecting...</body></html>');
    }

    public function deleteAction(Request $request, int $objectId): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $table = MAUTIC_TABLE_PREFIX.'friendly_content_blocks';

        try {
            $this->db->delete($table, ['id' => $objectId]);

            return new JsonResponse(['success' => true]);
        } catch (\Throwable $e) {
            $this->logger->error('ContentBlock delete failed: '.$e->getMessage());

            return new JsonResponse(['error' => 'An error occurred.'], 500);
        }
    }
}
