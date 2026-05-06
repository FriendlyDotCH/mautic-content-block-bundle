<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Entity;

use Mautic\CoreBundle\Entity\CommonRepository;

/**
 * @extends CommonRepository<ContentBlock>
 */
class ContentBlockRepository extends CommonRepository
{
    public function getTableAlias(): string
    {
        return 'cb';
    }

    /**
     * Return all blocks as a lightweight array for the GrapesJS API endpoint.
     *
     * @return array<int, array{id: int, name: string, category: string, htmlContent: string, thumbnail: string|null}>
     */
    public function findAllForApi(): array
    {
        return $this->createQueryBuilder('cb')
            ->select('cb.id, cb.name, cb.category, cb.htmlContent, cb.thumbnail')
            ->where('cb.isPublished = :pub')
            ->setParameter('pub', true)
            ->orderBy('cb.category', 'ASC')
            ->addOrderBy('cb.name', 'ASC')
            ->getQuery()
            ->getArrayResult();
    }
}
