<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Service;

use MauticPlugin\MauticContentBlockBundle\DTO\ContentBlockDto;
use MauticPlugin\MauticContentBlockBundle\Exception\AjaxException;
use MauticPlugin\MauticContentBlockBundle\Model\ContentBlockModel;

class ContentBlockService
{
    private const ALLOWED_CATEGORIES = ['general', 'header', 'footer', 'signature', 'legal', 'promotional'];

    public function __construct(
        private readonly ContentBlockModel $contentBlockModel,
    ) {
    }

    private function convertEntityToDto($entity): ContentBlockDto
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
     * @return ContentBlockDto[]
     */
    public function getBlocks($args = [
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

    public function addBlock(ContentBlockDto $dto): ContentBlockDto
    {
        $entity = $this->contentBlockModel->getEntity();
        $entity->setName($dto->getName());
        $entity->setHtmlContent($dto->getHtmlContent());
        $entity->setCbCategory($dto->getCbCategory());
        $entity->setIcon($dto->getIcon());
        $entity->setThumbnail($dto->getThumbnail());
        $entity->setIsPublished(true);

        /*$this->contentBlockModel->saveEntity($entity);
        return $this->convertEntityToDto($entity);*/
        return $dto;
    }

    // /**
    //  * @throws AjaxException
    //  */
    // public function addBlock(string $name, string $htmlContent, string $category, ?string $icon): ContentBlockDto
    // {
    //     if ('' === $name) {
    //         throw new AjaxException(400, 'Block name is required.');
    //     }

    //     if (mb_strlen($name) > 191) {
    //         throw new AjaxException(400, 'Name must be 191 characters or fewer.');
    //     }

    //     if ('' === $htmlContent) {
    //         throw new AjaxException(400, 'No HTML content to save.');
    //     }

    //     if (!in_array($category, self::ALLOWED_CATEGORIES, true)) {
    //         $category = 'general';
    //     }

    //     $table = MAUTIC_TABLE_PREFIX.'friendly_content_blocks';

    //     $this->db->insert($table, [
    //         'name'         => $name,
    //         'icon'         => $icon,
    //         'html_content' => $htmlContent,
    //         'cb_category'  => $category,
    //         'is_published' => 1,
    //         'date_added'   => (new \DateTime())->format('Y-m-d H:i:s'),
    //     ]);

    //     return (new ContentBlockDto())
    //         ->setId((int) $this->db->lastInsertId())
    //         ->setName($name)
    //         ->setIcon($icon)
    //         ->setCategory($category)
    //         ->setHtmlContent($htmlContent)
    //         ->setThumbnail(null);
    // }
}
