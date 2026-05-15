<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Controller;

use Mautic\CoreBundle\Controller\AbstractStandardFormController;
use Mautic\CoreBundle\Helper\InputHelper;
use MauticPlugin\MauticContentBlockBundle\Model\ContentBlockModel;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ContentBlockController extends AbstractStandardFormController
{
    private const ALLOWED_CATEGORIES = ['general', 'header', 'footer', 'signature', 'legal', 'promotional'];

    protected function getModelName(): string
    {
        return 'content_block.content_block';
    }

    protected function getRouteBase(): string
    {
        return 'mautic_contentblock';
    }

    protected function getTemplateBase(): string
    {
        return '@MauticContentBlock/ContentBlock';
    }

    protected function getTranslationBase(): string
    {
        return 'mautic.contentblock';
    }

    protected function getDefaultOrderColumn(): string
    {
        return 'name';
    }

    public function indexAction(Request $request, int $page = 1): Response
    {
        return parent::indexStandard($request, $page);
    }

    public function newAction(Request $request): Response
    {
        return parent::newStandard($request);
    }

    public function editAction(Request $request, int $objectId, bool $ignorePost = false): Response
    {
        return parent::editStandard($request, $objectId, $ignorePost);
    }

    public function deleteAction(Request $request, int $objectId): Response
    {
        return parent::deleteStandard($request, $objectId);
    }

    public function batchDeleteAction(Request $request): Response
    {
        return parent::batchDeleteStandard($request);
    }

    // public function toggleAction(Request $request, int $objectId): JsonResponse
    // {
    //     $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

    //     /** @var ContentBlockModel $model */
    //     $model  = $this->getModel($this->getModelName());
    //     $entity = $model->getEntity($objectId);

    //     if (null === $entity) {
    //         return new JsonResponse(['error' => 'Block not found.'], 404);
    //     }

    //     try {
    //         $entity->setIsPublished(!$entity->isPublished());
    //         $model->saveEntity($entity);

    //         return new JsonResponse(['success' => true]);
    //     } catch (\Throwable) {
    //         return new JsonResponse(['error' => 'An error occurred.'], 500);
    //     }
    // }

    // public function editInlineAction(Request $request, int $objectId): JsonResponse
    // {
    //     $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

    //     /** @var ContentBlockModel $model */
    //     $model  = $this->getModel($this->getModelName());
    //     $entity = $model->getEntity($objectId);

    //     if (null === $entity) {
    //         return new JsonResponse(['error' => 'Block not found.'], 404);
    //     }

    //     $name = trim(InputHelper::string((string) $request->request->get('name', '')));
    //     if ('' !== $name) {
    //         if (mb_strlen($name) > 191) {
    //             return new JsonResponse(['error' => 'Name must be 191 characters or fewer.'], 400);
    //         }
    //         $entity->setName($name);
    //     }

    //     $category = strtolower(trim(InputHelper::string((string) $request->request->get('category', ''))));
    //     if ('' !== $category) {
    //         if (!in_array($category, self::ALLOWED_CATEGORIES, true)) {
    //             return new JsonResponse(['error' => 'Invalid category.'], 400);
    //         }
    //         $entity->setCategory($category);
    //     }

    //     $iconRaw = $request->request->get('icon');
    //     if (null !== $iconRaw) {
    //         $icon = mb_substr(strip_tags((string) $iconRaw), 0, 20);
    //         $entity->setIcon('' !== $icon ? $icon : null);
    //     }

    //     $htmlContent = $request->request->get('htmlContent');
    //     if (null !== $htmlContent) {
    //         $entity->setHtmlContent(self::cleanHtmlContent((string) $htmlContent));
    //     }

    //     try {
    //         $model->saveEntity($entity);

    //         return new JsonResponse(['success' => true]);
    //     } catch (\Throwable) {
    //         return new JsonResponse(['error' => 'An error occurred.'], 500);
    //     }
    // }

    // public function executeAction(Request $request, string $objectAction, int $objectId = 0): Response
    // {
    //     return match ($objectAction) {
    //         'new'        => $this->newAction($request),
    //         'edit'       => $this->editAction($request, $objectId),
    //         'delete'     => $this->deleteAction($request, $objectId),
    //         'batchDelete' => $this->batchDeleteAction($request),
    //         'toggle'     => $this->toggleAction($request, $objectId),
    //         'editInline' => $this->editInlineAction($request, $objectId),
    //         default      => throw $this->createNotFoundException("Unknown action: {$objectAction}"),
    //     };
    // }

    // protected function getViewArguments(array $args, $action): array
    // {
    //     if (isset($args['viewParameters']['entity'])) {
    //         $args['viewParameters']['item'] = $args['viewParameters']['entity'];
    //     }

    //     return $args;
    // }

    // private static function cleanHtmlContent(string $html): string
    // {
    //     return str_replace("\0", '', $html);
    // }
}
