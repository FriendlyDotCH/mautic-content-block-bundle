<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Model;

use Mautic\CoreBundle\Model\FormModel;
use MauticPlugin\MauticContentBlockBundle\Entity\ContentBlock;
use MauticPlugin\MauticContentBlockBundle\Entity\ContentBlockRepository;
use MauticPlugin\MauticContentBlockBundle\Form\ContentBlockType;
use Symfony\Component\Form\FormFactoryInterface;
use Symfony\Component\HttpFoundation\Request;

class ContentBlockModel extends FormModel
{
    public function getRepository(): ContentBlockRepository
    {
        /** @var ContentBlockRepository */
        return $this->em->getRepository(ContentBlock::class);
    }

    public function getPermissionBase(): string
    {
        return 'plugin:contentBlock:blocks';
    }

    public function getNameGetter(): string
    {
        return 'getName';
    }

    public function createForm($entity, FormFactoryInterface $formFactory, $action = null, $options = []): \Symfony\Component\Form\FormInterface
    {
        if ($action) {
            $options['action'] = $action;
        }

        return $formFactory->create(ContentBlockType::class, $entity, $options);
    }

    public function getEntity($id = null): ?ContentBlock
    {
        if (null === $id) {
            return new ContentBlock();
        }

        return $this->getRepository()->find($id);
    }

    /**
     * @return array<int, array{id: int, name: string, category: string, htmlContent: string, thumbnail: string|null}>
     */
    public function getAllForApi(): array
    {
        return $this->getRepository()->findAllForApi();
    }

    public function saveEntity($entity, $unlock = true): void
    {
        parent::saveEntity($entity, $unlock);
    }
}
