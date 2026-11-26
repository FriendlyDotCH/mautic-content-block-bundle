<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Integration\Support;

use Mautic\IntegrationsBundle\DTO\Note;
use Mautic\IntegrationsBundle\Integration\DefaultConfigFormTrait;
use Mautic\IntegrationsBundle\Integration\Interfaces\ConfigFormFeatureSettingsInterface;
use Mautic\IntegrationsBundle\Integration\Interfaces\ConfigFormInterface;
use Mautic\IntegrationsBundle\Integration\Interfaces\ConfigFormNotesInterface;
use MauticPlugin\MauticContentBlockBundle\Form\Type\ConfigFeaturesType;
use MauticPlugin\MauticContentBlockBundle\Integration\ContentBlocksIntegration;

final class ConfigSupport extends ContentBlocksIntegration implements ConfigFormInterface, ConfigFormFeatureSettingsInterface, ConfigFormNotesInterface
{
    use DefaultConfigFormTrait;

    public function getFeatureSettingsConfigFormName(): string
    {
        return ConfigFeaturesType::class;
    }

    /**
     * Shown on the Enabled/Auth tab in place of the published toggle, which
     * Form\Extension\IntegrationConfigTypeExtension removes for this integration.
     */
    public function getAuthorizationNote(): ?Note
    {
        return new Note('mautic.contentblock.integration.always_published', Note::TYPE_INFO);
    }

    public function getFeaturesNote(): ?Note
    {
        return null;
    }

    public function getFieldMappingNote(): ?Note
    {
        return null;
    }
}
