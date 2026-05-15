<?php

declare(strict_types=1);

return [
    'name'        => 'Content Blocks',
    'description' => 'Reusable saved content blocks for the GrapesJS page/email builder.',
    'version'     => '2.0.2',
    'author'      => 'Friendly Automate',

    'routes' => [
        'main' => [
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
            'mautic_contentblock_list_ajax' => [
                'path'       => '/content-blocks/list',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockApiController::class.'::listAction',
            ],
            'mautic_contentblock_save' => [
                'path'       => '/content-blocks/save',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockApiController::class.'::saveAction',
                'methods'    => ['POST'],
            ],
        ],
    ],

    'menu' => [
        'main' => [
            // Use a plain readable string as key — Mautic will try to translate it,
            // fall back to the key itself, which is already human-readable.
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
