<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\EventListener;

use Mautic\CoreBundle\CoreEvents;
use Mautic\CoreBundle\Event\CustomAssetsEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class AssetsSubscriber implements EventSubscriberInterface
{
    private const SCRIPTS = [
        'contentblocks.admin.js',
        'contentblocks.grapesjs.js',
        'contentblocks.editor.js',
    ];

    public function __construct(
        private string $pluginPath = __DIR__.'/..'
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
        $relative = 'plugins/MauticContentBlockBundle/Assets/js/dist/'.$script;
        $mtime    = @filemtime($this->pluginPath.'/Assets/js/dist/'.$script);

        return $mtime ? $relative.'?cb='.$mtime : $relative;
    }
}
