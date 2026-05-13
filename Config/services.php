<?php

declare(strict_types=1);

use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;

use function Symfony\Component\DependencyInjection\Loader\Configurator\service;

return function (ContainerConfigurator $configurator): void {
    $services = $configurator->services()
        ->defaults()
        ->autowire()
        ->autoconfigure()
        ->public();

    $services->load('MauticPlugin\\MauticContentBlockBundle\\', '../')
        ->exclude('../{Config,DependencyInjection,Entity,Migrations,migrations_old,Resources,Security,Translations,Views}');

    // Explicit DBAL connection since Symfony can't disambiguate Connection by type alone.
    $services->set(MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockController::class)
        ->arg('$db', service('doctrine.dbal.default_connection'));

    $services->set(MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockApiController::class)
        ->arg('$db', service('doctrine.dbal.default_connection'));

    $services->set('mautic.content_block.model.content_block', MauticPlugin\MauticContentBlockBundle\Model\ContentBlockModel::class);
};
