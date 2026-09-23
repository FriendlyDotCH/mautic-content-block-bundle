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
        // CoreEvents::VIEW_INJECT_CUSTOM_ASSETS fires on every request, including public
        // pages rendered from a theme (landing pages, forms). Those templates call
        // outputScripts('bodyClose') too, but never load script.html.twig, so globals like
        // mauticBasePath don't exist there. Restrict injection to the admin area, matching
        // GrapesJsBuilderBundle\EventSubscriber\AssetsSubscriber::isMauticAdministrationPage(),
        // to avoid a ReferenceError on mauticBasePath on public-facing pages.
        if (!$this->isMauticAdministrationPage()) {
            return;
        }

        // Loaded globally so Mautic.contentBlockOnLoad is always pre-registered.
        // Mautic's AJAX navigation does not re-inject bodyClose scripts, so the
        // callback must exist from the initial full-page load regardless of which
        // route the user lands on first.
        $assetsEvent->addScript('plugins/MauticContentBlockBundle/Assets/js/dist/contentblocks.admin.js', 'bodyClose');
        $assetsEvent->addScript('plugins/MauticContentBlockBundle/Assets/js/dist/contentblocks.grapesjs.js', 'bodyClose');
    }

    /**
     * Returns true for routes that start with /s/.
     */
    private function isMauticAdministrationPage(): bool
    {
        $request = $this->requestStack->getCurrentRequest();

        return null !== $request && preg_match('/^\/s\//', $request->getPathInfo()) >= 1;
    }
}
