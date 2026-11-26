<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Integration;

use Mautic\IntegrationsBundle\Integration\BasicIntegration;
use Mautic\IntegrationsBundle\Integration\ConfigurationTrait;
use Mautic\IntegrationsBundle\Integration\Interfaces\BasicInterface;
use Mautic\PluginBundle\Entity\Integration;

/**
 * The plugin's integration on the Plugins page ("Content Blocks"). It holds the plugin's settings
 * (Features tab, see Support\ConfigSupport) and uses Mautic's integration framework to store them.
 *
 * It publishes itself when Mautic first creates its settings row, so a fresh install is enabled
 * without anyone opening the card. Content blocks work whatever its state; it only decides whether
 * the stored settings are used (ContentBlockConfigService falls back to defaults otherwise).
 */
class ContentBlocksIntegration extends BasicIntegration implements BasicInterface
{
    use ConfigurationTrait;

    // Must match the class file name minus "Integration": the legacy IntegrationHelper derives the
    // stored row name from it.
    public const NAME = 'ContentBlocks';

    public const DISPLAY_NAME = 'Content Blocks';

    public function getName(): string
    {
        return self::NAME;
    }

    public function getDisplayName(): string
    {
        return self::DISPLAY_NAME;
    }

    public function getIcon(): string
    {
        return 'plugins/MauticContentBlockBundle/Assets/img/icon.png';
    }

    public function setIntegrationConfiguration(Integration $integration): void
    {
        if (null === $integration->getId() && !$integration->getIsPublished()) {
            $integration->setIsPublished(true);
        }

        $this->integration = $integration;
    }
}
