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
}
