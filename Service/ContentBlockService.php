<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Service;

use MauticPlugin\MauticContentBlockBundle\DTO\AddBlockRequest;
use MauticPlugin\MauticContentBlockBundle\DTO\ContentBlockDto;
use MauticPlugin\MauticContentBlockBundle\Entity\ContentBlock;
use MauticPlugin\MauticContentBlockBundle\Model\ContentBlockModel;

class ContentBlockService
{
    public function __construct(
        private readonly ContentBlockModel $contentBlockModel,
    ) {
    }

    private function convertEntityToDto(ContentBlock $entity): ContentBlockDto
    {
        $dto = new ContentBlockDto();
        $dto->setId($entity->getId());
        $dto->setName($entity->getName());
        $dto->setIcon($entity->getIcon());
        $dto->setCbCategory($entity->getCbCategory());
        $dto->setHtmlContent($entity->getHtmlContent());
        $dto->setThumbnail($entity->getThumbnail());

        return $dto;
    }

    /**
     * @param array<string, mixed> $args
     *
     * @return ContentBlockDto[]
     */
    public function getBlocks(array $args = [
        'start'       => 0,
        'limit'       => 100,
        'isPublished' => true,
    ]): array
    {
        $data = [];

        $entities = $this->contentBlockModel->getEntities([
            'limit'  => $args['limit'],
            'start'  => $args['start'],
            'filter' => [
                'force' => [
                    [
                        'column' => 'cb.isPublished',
                        'expr'   => 'eq',
                        'value'  => $args['isPublished'],
                    ],
                ],
            ],
        ]);

        foreach ($entities as $entity) {
            $data[] = $this->convertEntityToDto($entity);
        }

        return $data;
    }

    public function addBlock(AddBlockRequest $dto): ContentBlockDto
    {
        $entity = $this->contentBlockModel->getEntity();
        $entity->setName($dto->getName());
        $entity->setHtmlContent($dto->getHtmlContent());
        $entity->setCbCategory('general');
        $entity->setIcon($dto->getIcon());
        $entity->setThumbnail(null);
        $entity->setIsPublished(true);

        $this->contentBlockModel->saveEntity($entity);

        return $this->convertEntityToDto($entity);
    }
}
