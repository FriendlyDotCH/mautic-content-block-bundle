<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\EventListener;

use Mautic\CoreBundle\CoreEvents;
use Mautic\CoreBundle\Event\CustomAssetsEvent;
use Mautic\CoreBundle\Helper\CoreParametersHelper;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\RequestStack;

class AssetsSubscriber implements EventSubscriberInterface
{
    private const BUNDLE = 'MauticContentBlockBundle';

    private const SCRIPTS = [
        'contentblocks.admin.js',
        'contentblocks.grapesjs.js',
        'contentblocks.editor.js',
    ];

    public function __construct(
        private CoreParametersHelper $coreParametersHelper,
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
        // contentblocks.editor.js activates only on the block form; the 1.3 MB mjml-browser
        // compiler it drives is fetched on demand, not from here.
        foreach (self::SCRIPTS as $script) {
            $assetsEvent->addScript($this->versioned($script), 'bodyClose');
        }
    }

    /**
     * Mautic versions asset URLs with sha1(secret_key + Mautic version), which does not change
     * when a plugin ships new JavaScript - so browsers keep serving the previously cached file
     * until a hard reload. Appending the build's mtime makes every rebuild a new URL.
     */
    private function versioned(string $script): string
    {
        $bundle   = $this->coreParametersHelper->get('plugin.bundles')[self::BUNDLE] ?? [];
        $relative = ($bundle['relative'] ?? 'plugins/'.self::BUNDLE).'/Assets/js/dist/'.$script;
        $mtime    = isset($bundle['directory']) ? @filemtime($bundle['directory'].'/Assets/js/dist/'.$script) : false;

        return $mtime ? $relative.'?cb='.$mtime : $relative;
    }

    /**
     * Returns true for routes that start with /s/, excluding the ones known to
     * render a bare public-style template (no script.html.twig, no mauticBasePath)
     * despite living under the admin path prefix.
     */
    private function isMauticAdministrationPage(): bool
    {
        $request = $this->requestStack->getCurrentRequest();

        if (null === $request || preg_match('/^\/s\//', $request->getPathInfo()) < 1) {
            return false;
        }

        // /s/forms/preview/{id} dispatches to FormController::previewAction, which
        // renders the same bare form.html.twig used by the public preview route.
        return 'mautic_form_action' !== $request->attributes->get('_route') || 'preview' !== $request->attributes->get('objectAction');
    }
}
