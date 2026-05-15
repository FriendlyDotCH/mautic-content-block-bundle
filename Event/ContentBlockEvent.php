<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Event;

use Mautic\CoreBundle\Event\CommonEvent;
use MauticPlugin\MauticContentBlockBundle\Entity\ContentBlock;

class ContentBlockEvent extends CommonEvent
{
    public function __construct(ContentBlock $contentBlock, bool $isNew = false)
    {
        $this->entity = $contentBlock;
        $this->isNew  = $isNew;
    }

    public function getContentBlock(): ContentBlock
    {
        /** @var ContentBlock $entity */
        $entity = $this->entity;

        return $entity;
    }
}
