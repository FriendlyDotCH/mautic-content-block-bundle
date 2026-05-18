<?php

declare(strict_types=1);

return [
    'name'        => 'Content Blocks',
    'description' => 'Reusable saved content blocks for the GrapesJS page/email builder.',
    'version'     => '2.0.2',
    'author'      => 'Friendly Automate',

    'routes' => [
        'main' => [
            'mautic_contentblock_editor_list' => [
                'path'       => '/content-blocks/editor',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockGrapeController::class.'::getBlocksAction',
                'methods'    => ['GET'],
            ],
            // 'mautic_contentblock_editor_save' => [
            //     'path'       => '/content-blocks/editor',
            //     'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockGrapeController::class.'::postBlockAction',
            //     'methods'    => ['POST'],
            // ],
            'mautic_contentblock_index' => [
                'path'       => '/content-blocks/{page}',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockController::class.'::indexAction',
                'defaults'   => ['page' => 1],
            ],
            'mautic_contentblock_action' => [
                'path'       => '/content-blocks/{objectAction}/{objectId}',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockController::class.'::executeAction',
                'defaults'   => ['objectId' => 0],
            ],
        ],
    ],

    'menu' => [
        'main' => [
            'mautic.contentblock.menu.index' => [
                'route'    => 'mautic_contentblock_index',
                'parent'   => 'mautic.core.components',
                'priority' => 60,
            ],
        ],
    ],

    'services' => [],

    'parameters' => [],
];
