<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Controller;

use Mautic\CoreBundle\Controller\AbstractStandardFormController;
use MauticPlugin\MauticContentBlockBundle\Entity\ContentBlock;
use MauticPlugin\MauticContentBlockBundle\Model\ContentBlockModel;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ContentBlockController extends AbstractStandardFormController
{
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
        if ($blocked = $this->refuseIfLinkedAndInUse($objectId)) {
            return $blocked;
        }

        return parent::deleteStandard($request, $objectId);
    }

    public function batchDeleteAction(Request $request): Response
    {
        return parent::batchDeleteStandard($request);
    }

    /**
     * Deleting a copy block is harmless - its MJML already lives in the emails. Deleting a
     * linked block silently empties it out of every email still referencing the token, so
     * refuse and name the emails instead.
     */
    private function refuseIfLinkedAndInUse(int $objectId): ?Response
    {
        /** @var ContentBlockModel $model */
        $model  = $this->getModel('content_block.content_block');
        $entity = $model->getEntity($objectId);

        if (!$entity instanceof ContentBlock || !$entity->isLinked()) {
            return null;
        }

        $emails = $model->getRepository()->findEmailsUsingBlock($objectId);
        if ([] === $emails) {
            return null;
        }

        $names = array_map(static fn (array $e): string => $e['name'].' (#'.$e['id'].')', $emails);

        $this->addFlashMessage(
            'mautic.contentblock.delete.in_use',
            ['%name%' => $entity->getName(), '%count%' => count($emails), '%emails%' => implode(', ', $names)],
            'error'
        );

        return $this->redirectToRoute('mautic_contentblock_index');
    }

    /**
     * @param array<string, mixed> $args
     *
     * @return array<string, mixed>
     */
    protected function getViewArguments(array $args, mixed $action): array
    {
        $args['passthroughVars']['mauticContent'] = match ($action) {
            'index' => 'contentBlock',
            default => 'contentBlockEdit',
        };


        return $args;
    }
}
