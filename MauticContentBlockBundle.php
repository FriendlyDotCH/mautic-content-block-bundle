<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle;

use Mautic\IntegrationsBundle\Bundle\AbstractPluginBundle;
use MauticPlugin\MauticContentBlockBundle\DependencyInjection\MauticContentBlockExtension;

class MauticContentBlockBundle extends AbstractPluginBundle
{
    public function getContainerExtension(): ?\Symfony\Component\DependencyInjection\Extension\ExtensionInterface
    {
        return new MauticContentBlockExtension();
    }
}
