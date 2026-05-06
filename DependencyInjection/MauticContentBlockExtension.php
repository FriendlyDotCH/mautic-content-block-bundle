<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\DependencyInjection;

use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Extension\PrependExtensionInterface;
use Symfony\Component\HttpKernel\DependencyInjection\Extension;

class MauticContentBlockExtension extends Extension implements PrependExtensionInterface
{
    public function load(array $configs, ContainerBuilder $container): void
    {
    }

    public function prepend(ContainerBuilder $container): void
    {
        // Register the Views directory as @MauticContentBlock Twig namespace
        // via prependExtensionConfig — this runs before any bundle loads and is reliable
        $container->prependExtensionConfig('twig', [
            'paths' => [
                \dirname(__DIR__) . '/Views' => 'MauticContentBlock',
            ],
        ]);
    }
}
