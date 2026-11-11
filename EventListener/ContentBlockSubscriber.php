<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\EventListener;

use MauticPlugin\MauticContentBlockBundle\ContentBlockEvents;
use MauticPlugin\MauticContentBlockBundle\Event\ContentBlockEvent;
use MauticPlugin\MauticContentBlockBundle\Service\LinkedBlockResolver;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Drops the linked-block cache as soon as a block changes in this process, so a preview
 * taken right after saving shows the new content instead of waiting out the TTL.
 */
class ContentBlockSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private LinkedBlockResolver $resolver
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            ContentBlockEvents::CONTENT_BLOCK_POST_SAVE   => ['onChange', 0],
            ContentBlockEvents::CONTENT_BLOCK_POST_DELETE => ['onChange', 0],
        ];
    }

    public function onChange(ContentBlockEvent $event): void
    {
        $this->resolver->reset();
    }
}
