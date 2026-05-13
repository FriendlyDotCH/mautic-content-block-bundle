<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Controller;

use Doctrine\DBAL\Connection;
use Doctrine\Persistence\ManagerRegistry;
use Mautic\CoreBundle\Controller\AbstractFormController;
use Mautic\CoreBundle\Factory\ModelFactory;
use Mautic\CoreBundle\Factory\PageHelperFactoryInterface;
use Mautic\CoreBundle\Helper\CoreParametersHelper;
use Mautic\CoreBundle\Helper\InputHelper;
use Mautic\CoreBundle\Helper\UserHelper;
use Mautic\CoreBundle\Security\Permissions\CorePermissions;
use Mautic\CoreBundle\Service\FlashBag;
use Mautic\CoreBundle\Translation\Translator;
use MauticPlugin\MauticContentBlockBundle\Form\Type\ContentBlockType;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpFoundation\Response;

class ContentBlockController extends AbstractFormController
{
    private const ALLOWED_CATEGORIES = ['general', 'header', 'footer', 'signature', 'legal', 'promotional'];
    private const ORDER_COLUMNS      = ['name' => 'name', 'category' => 'category', 'date_added' => 'date_added', 'id' => 'id'];

    public function __construct(
        private readonly Connection $db,
        private readonly LoggerInterface $logger,
        private readonly PageHelperFactoryInterface $pageHelperFactory,
        ManagerRegistry $doctrine,
        ModelFactory $modelFactory,
        UserHelper $userHelper,
        CoreParametersHelper $coreParametersHelper,
        EventDispatcherInterface $dispatcher,
        Translator $translator,
        FlashBag $flashBag,
        RequestStack $requestStack,
        CorePermissions $security,
    ) {
        parent::__construct($doctrine, $modelFactory, $userHelper, $coreParametersHelper, $dispatcher, $translator, $flashBag, $requestStack, $security);
    }

    public function indexAction(Request $request, int $page = 1): Response
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $session = $request->getSession();

        if ($request->query->has('search')) {
            $search = trim(InputHelper::string((string) $request->query->get('search', '')));
            $session->set('mautic.contentBlock.filter', $search);
        } else {
            $search = (string) $session->get('mautic.contentBlock.filter', '');
        }

        if ($request->query->has('orderby')) {
            $orderBy = self::ORDER_COLUMNS[$request->query->get('orderby')] ?? 'name';
            $session->set('mautic.contentBlock.orderby', $orderBy);
        } else {
            $orderBy = self::ORDER_COLUMNS[(string) $session->get('mautic.contentBlock.orderby', 'name')] ?? 'name';
        }

        if ($request->query->has('orderbydir')) {
            $orderDir = 'desc' === strtolower((string) $request->query->get('orderbydir', 'asc')) ? 'DESC' : 'ASC';
            $session->set('mautic.contentBlock.orderbydir', $orderDir);
        } else {
            $orderDir = 'DESC' === strtoupper((string) $session->get('mautic.contentBlock.orderbydir', 'ASC')) ? 'DESC' : 'ASC';
        }

        $pageHelper = $this->pageHelperFactory->make('contentBlock', $page);
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
        $tmpl  = $request->isXmlHttpRequest() ? $request->get('tmpl', 'index') : 'index';

        return $this->delegateView([
            'viewParameters'  => [
                'items'       => $items,
                'page'        => $page,
                'limit'       => $limit,
                'totalItems'  => $total,
                'searchValue' => $search,
                'tmpl'        => $tmpl,
            ],
            'contentTemplate' => '@MauticContentBlock/ContentBlock/index.html.twig',
            'passthroughVars' => [
                'mauticContent' => 'contentBlock',
                'route'         => $route,
            ],
        ]);
    }

    public function newAction(Request $request): Response
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $route = $this->generateUrl('mautic_contentblock_new');
        $form  = $this->createForm(ContentBlockType::class, [], ['action' => $route]);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $d     = $form->getData();
            $table = MAUTIC_TABLE_PREFIX.'friendly_content_blocks';

            try {
                $this->db->insert($table, [
                    'name'         => $d['name'],
                    'category'     => $d['category'] ?? 'general',
                    'icon'         => '' !== (string) ($d['icon'] ?? '') ? mb_substr(strip_tags((string) $d['icon']), 0, 20) : null,
                    'html_content' => self::cleanHtmlContent((string) ($d['htmlContent'] ?? '')),
                    'is_published' => 1,
                    'date_added'   => (new \DateTime())->format('Y-m-d H:i:s'),
                ]);
            } catch (\Throwable $e) {
                $this->logger->error('ContentBlock new failed: '.$e->getMessage());
            }

            return $this->redirectToList($request);
        }

        return $this->delegateView([
            'viewParameters'  => ['form' => $form->createView(), 'item' => []],
            'contentTemplate' => '@MauticContentBlock/ContentBlock/form.html.twig',
            'passthroughVars' => [
                'mauticContent' => 'contentBlockEdit',
                'route'         => $route,
            ],
        ]);
    }

    public function editPageAction(Request $request, int $objectId): Response
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $table = MAUTIC_TABLE_PREFIX.'friendly_content_blocks';
        $row   = $this->db->fetchAssociative(
            "SELECT id, name, icon, category, html_content FROM `{$table}` WHERE id = ?",
            [$objectId]
        );

        if (false === $row) {
            throw $this->createNotFoundException('Content block not found.');
        }

        $route = $this->generateUrl('mautic_contentblock_edit_page', ['objectId' => $objectId]);
        $form  = $this->createForm(ContentBlockType::class, [
            'name'        => $row['name'],
            'category'    => $row['category'] ?? 'general',
            'icon'        => $row['icon'] ?? '',
            'htmlContent' => $row['html_content'],
        ], ['action' => $route]);

        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $d = $form->getData();

            try {
                $this->db->update($table, [
                    'name'         => $d['name'],
                    'category'     => $d['category'] ?? 'general',
                    'icon'         => '' !== (string) ($d['icon'] ?? '') ? mb_substr(strip_tags((string) $d['icon']), 0, 20) : null,
                    'html_content' => self::cleanHtmlContent((string) ($d['htmlContent'] ?? '')),
                ], ['id' => $objectId]);
            } catch (\Throwable $e) {
                $this->logger->error('ContentBlock editPage failed: '.$e->getMessage());
            }

            return $this->redirectToList($request);
        }

        return $this->delegateView([
            'viewParameters'  => ['form' => $form->createView(), 'item' => $row],
            'contentTemplate' => '@MauticContentBlock/ContentBlock/form.html.twig',
            'passthroughVars' => [
                'mauticContent' => 'contentBlockEdit',
                'route'         => $route,
            ],
        ]);
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
            $data['html_content'] = self::cleanHtmlContent((string) $htmlContent);
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

    public function deleteAction(Request $request, int $objectId): Response
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $table = MAUTIC_TABLE_PREFIX.'friendly_content_blocks';
        $page  = (int) $request->getSession()->get('mautic.contentBlock.page', 1);

        try {
            $this->db->delete($table, ['id' => $objectId]);
        } catch (\Throwable $e) {
            $this->logger->error('ContentBlock delete failed: '.$e->getMessage());
        }

        return $this->postActionRedirect([
            'returnUrl'       => $this->generateUrl('mautic_contentblock_index', ['page' => $page]),
            'viewParameters'  => ['page' => $page],
            'contentTemplate' => self::class.'::indexAction',
            'passthroughVars' => [
                'mauticContent' => 'contentBlock',
            ],
            'forwardController' => true,
        ]);
    }

    public function dispatchAction(Request $request, string $objectAction, int $objectId = 0): Response
    {
        return match ($objectAction) {
            'edit'   => $this->editPageAction($request, $objectId),
            'delete' => $this->deleteAction($request, $objectId),
            default  => throw $this->createNotFoundException("Unknown action: {$objectAction}"),
        };
    }

    private function redirectToList(Request $request): Response
    {
        $page = (int) $request->getSession()->get('mautic.contentBlock.page', 1);

        return $this->postActionRedirect([
            'returnUrl'       => $this->generateUrl('mautic_contentblock_index', ['page' => $page]),
            'viewParameters'  => ['page' => $page],
            'contentTemplate' => self::class.'::indexAction',
            'passthroughVars' => [
                'mauticContent' => 'contentBlock',
            ],
            'forwardController' => true,
        ]);
    }

    private static function cleanHtmlContent(string $html): string
    {
        return str_replace("\0", '', $html);
    }
}
