<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Tests\Unit;

use Mautic\IntegrationsBundle\Exception\IntegrationNotFoundException;
use Mautic\IntegrationsBundle\Helper\IntegrationsHelper;
use Mautic\PluginBundle\Entity\Integration;
use MauticPlugin\MauticContentBlockBundle\Integration\ContentBlocksIntegration;
use MauticPlugin\MauticContentBlockBundle\Service\ContentBlockConfigService;
use PHPUnit\Framework\TestCase;

class ContentBlockConfigServiceTest extends TestCase
{
    public function testPublishedIntegrationValueIsUsed(): void
    {
        $this->assertSame(300, $this->service(true, ['integration' => ['content_block_cache_ttl' => '300']])->getCacheTtl());
    }

    public function testZeroIsAValidValue(): void
    {
        $this->assertSame(0, $this->service(true, ['integration' => ['content_block_cache_ttl' => 0]])->getCacheTtl());
    }

    public function testUnpublishedIntegrationFallsBackToDefault(): void
    {
        $this->assertSame(60, $this->service(false, ['integration' => ['content_block_cache_ttl' => 300]])->getCacheTtl());
    }

    public function testMissingOrInvalidValueFallsBackToDefault(): void
    {
        $this->assertSame(60, $this->service(true, [])->getCacheTtl());
        $this->assertSame(60, $this->service(true, ['integration' => ['content_block_cache_ttl' => 'abc']])->getCacheTtl());
        $this->assertSame(60, $this->service(true, ['integration' => ['content_block_cache_ttl' => -5]])->getCacheTtl());
    }

    public function testMissingIntegrationFallsBackToDefault(): void
    {
        $helper = $this->createMock(IntegrationsHelper::class);
        $helper->method('getIntegration')->willThrowException(new IntegrationNotFoundException());

        $this->assertSame(60, (new ContentBlockConfigService($helper))->getCacheTtl());
    }

    public function testNewRowIsPublishedOnAttach(): void
    {
        $configuration = new Integration();
        $this->assertFalse($configuration->getIsPublished());

        (new ContentBlocksIntegration())->setIntegrationConfiguration($configuration);

        $this->assertTrue($configuration->getIsPublished());
    }

    /**
     * @param array<string, mixed> $featureSettings
     */
    private function service(bool $published, array $featureSettings): ContentBlockConfigService
    {
        $configuration = new Integration();
        $configuration->setName(ContentBlocksIntegration::NAME);
        $configuration->setFeatureSettings($featureSettings);

        $integration = new ContentBlocksIntegration();
        $integration->setIntegrationConfiguration($configuration);
        // After attaching: a new row is auto-published on attach (see testNewRowIsPublishedOnAttach).
        $configuration->setIsPublished($published);

        $helper = $this->createMock(IntegrationsHelper::class);
        $helper->method('getIntegration')->with(ContentBlocksIntegration::NAME)->willReturn($integration);

        return new ContentBlockConfigService($helper);
    }
}
