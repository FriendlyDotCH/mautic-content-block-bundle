<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\EventListener;

use Mautic\CoreBundle\CoreEvents;
use Mautic\CoreBundle\Event\CustomAssetsEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\RequestStack;

class AssetsSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly RequestStack $requestStack,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            CoreEvents::VIEW_INJECT_CUSTOM_ASSETS => ['injectAssets', 0],
        ];
    }

    public function injectAssets(CustomAssetsEvent $assetsEvent): void
    {
        $request = $this->requestStack->getCurrentRequest();
        if (null === $request) {
            return;
        }

        if (str_starts_with($request->getPathInfo(), '/s/content-blocks')) {
            $assetsEvent->addScript('plugins/MauticContentBlockBundle/Assets/js/lazy/contentblocks.admin.js');
        } elseif (str_starts_with($request->getPathInfo(), '/s/emails')) {
            $assetsEvent->addScript('plugins/MauticContentBlockBundle/Assets/js/lazy/contentblocks.grapesjs.js');
        }
    }
}
