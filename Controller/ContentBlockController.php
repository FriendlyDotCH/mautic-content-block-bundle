<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Controller;

use Mautic\CoreBundle\Controller\AbstractStandardFormController;
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

    protected function getViewArguments(array $args, $action): array
    {
        $args['passthroughVars']['mauticContent'] = match ($action) {
            'index' => 'contentBlock',
            default => 'contentBlockEdit',
        };

        return $args;
    }
}
