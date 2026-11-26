<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Service;

use Mautic\IntegrationsBundle\Helper\IntegrationsHelper;
use MauticPlugin\MauticContentBlockBundle\Integration\ContentBlocksIntegration;

/**
 * Reads the plugin's settings from the ContentBlocks integration (Plugins > Content Blocks > Features).
 *
 * Never throws: if the integration is missing, unpublished or holds an invalid value, the
 * default is returned. Content blocks must keep working whatever state the settings are in.
 */
class ContentBlockConfigService
{
    public const CACHE_TTL         = 'content_block_cache_ttl';
    public const DEFAULT_CACHE_TTL = 60;

    public function __construct(
        private IntegrationsHelper $integrationsHelper,
    ) {
    }

    /**
     * Seconds a process keeps linked blocks in memory before re-reading them. 0 = never expire.
     */
    public function getCacheTtl(): int
    {
        $value = $this->getSettings()[self::CACHE_TTL] ?? null;

        return is_numeric($value) && (int) $value >= 0 ? (int) $value : self::DEFAULT_CACHE_TTL;
    }

    /**
     * The integration's feature settings, or [] when it is unpublished or unavailable.
     *
     * @return array<string, mixed>
     */
    private function getSettings(): array
    {
        try {
            $configuration = $this->integrationsHelper
                ->getIntegration(ContentBlocksIntegration::NAME)
                ->getIntegrationConfiguration();

            if (!$configuration->getIsPublished()) {
                return [];
            }

            $settings = $configuration->getFeatureSettings()['integration'] ?? [];

            return is_array($settings) ? $settings : [];
        } catch (\Throwable) {
            // Not installed yet, row never saved, DB hiccup: fall back to defaults silently.
            return [];
        }
    }
}
