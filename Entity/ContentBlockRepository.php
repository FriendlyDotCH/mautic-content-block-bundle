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

    public function nameExists(string $name): bool
    {
        return (bool) $this->createQueryBuilder('cb')
            ->select('1')
            ->where('cb.name = :name')
            ->setParameter('name', $name)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
