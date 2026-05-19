<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\EventListener;

use Mautic\CoreBundle\CoreEvents;
use Mautic\CoreBundle\Event\CustomAssetsEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class AssetsSubscriber implements EventSubscriberInterface
{
    public function __construct()
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            CoreEvents::VIEW_INJECT_CUSTOM_ASSETS => ['injectAssets', 0],
        ];
    }

    public function injectAssets(CustomAssetsEvent $assetsEvent): void
    {
        // Loaded globally so Mautic.contentBlockOnLoad is always pre-registered.
        // Mautic's AJAX navigation does not re-inject bodyClose scripts, so the
        // callback must exist from the initial full-page load regardless of which
        // route the user lands on first.
        $assetsEvent->addScript('plugins/MauticContentBlockBundle/Assets/js/dist/contentblocks.admin.js', 'bodyClose');
        $assetsEvent->addScript('plugins/MauticContentBlockBundle/Assets/js/dist/contentblocks.grapesjs.js', 'bodyClose');
    }
}
