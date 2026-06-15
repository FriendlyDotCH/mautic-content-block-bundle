<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Model;

use Mautic\CategoryBundle\Entity\Category;
use Mautic\CategoryBundle\Model\CategoryModel;
use Mautic\CoreBundle\Model\FormModel;
use MauticPlugin\MauticContentBlockBundle\ContentBlockEvents;
use MauticPlugin\MauticContentBlockBundle\Entity\ContentBlock;
use MauticPlugin\MauticContentBlockBundle\Entity\ContentBlockRepository;
use MauticPlugin\MauticContentBlockBundle\Event\ContentBlockEvent;
use MauticPlugin\MauticContentBlockBundle\Form\Type\ContentBlockType;
use Symfony\Component\Form\FormFactoryInterface;
use Symfony\Component\Form\FormInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Contracts\EventDispatcher\Event;
use Symfony\Contracts\Service\Attribute\Required;

/**
 * @extends FormModel<ContentBlock>
 */
class ContentBlockModel extends FormModel
{
    public const CATEGORY_BUNDLE = 'content_block';

    private ?CategoryModel $categoryModel = null;

    #[Required]
    public function setCategoryModel(CategoryModel $categoryModel): void
    {
        $this->categoryModel = $categoryModel;
    }

    public function getEntity(mixed $id = null): ?ContentBlock
    {
        if (null === $id) {
            return new ContentBlock();
        }

        return $this->getRepository()->find($id);
    }

    /**
     * Resolve the default "General" category for content blocks, or null if absent.
     */
    public function getDefaultCategory(): ?Category
    {
        $category = $this->categoryModel?->getRepository()->findOneBy([
            'bundle' => self::CATEGORY_BUNDLE,
            'alias'  => 'general',
        ]);

        return $category instanceof Category ? $category : null;
    }

    /**
     * @param ContentBlock $entity
     */
    public function saveEntity($entity, $unlock = true): void
    {
        if ($entity instanceof ContentBlock && null === $entity->getCategory()) {
            $entity->setCategory($this->getDefaultCategory());
        }

        parent::saveEntity($entity, $unlock);
    }

    public function getRepository(): ContentBlockRepository
    {
        /** @var ContentBlockRepository */
        return $this->em->getRepository(ContentBlock::class);
    }

    public function getPermissionBase(): string
    {
        return 'contentBlock:blocks';
    }

    /**
     * @param ContentBlock $entity
     * @param array<mixed> $options
     */
    public function createForm($entity, FormFactoryInterface $formFactory, $action = null, $options = []): FormInterface
    {
        if (!$entity instanceof ContentBlock) {
            throw new MethodNotAllowedHttpException(['ContentBlock']);
        }

        if (!empty($action)) {
            $options['action'] = $action;
        }

        return $formFactory->create(ContentBlockType::class, $entity, $options);
    }

    protected function dispatchEvent($action, &$entity, $isNew = false, ?Event $event = null): ?Event
    {
        if (!$entity instanceof ContentBlock) {
            throw new MethodNotAllowedHttpException(['ContentBlock']);
        }

        $name = match ($action) {
            'pre_save'    => ContentBlockEvents::CONTENT_BLOCK_PRE_SAVE,
            'post_save'   => ContentBlockEvents::CONTENT_BLOCK_POST_SAVE,
            'pre_delete'  => ContentBlockEvents::CONTENT_BLOCK_PRE_DELETE,
            'post_delete' => ContentBlockEvents::CONTENT_BLOCK_POST_DELETE,
            default       => null,
        };

        if (null === $name || !$this->dispatcher->hasListeners($name)) {
            return null;
        }

        if (empty($event)) {
            $event = new ContentBlockEvent($entity, $isNew);
            $event->setEntityManager($this->em);
        }

        $this->dispatcher->dispatch($event, $name);

        return $event;
    }
}
