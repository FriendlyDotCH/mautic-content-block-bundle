<?php

namespace MauticPlugin\MauticContentBlockBundle;

final class ContentBlockEvents
{
    public const CONTENT_BLOCK_PRE_SAVE    = 'mautic.content_block.pre_save';
    public const CONTENT_BLOCK_POST_SAVE   = 'mautic.content_block.post_save';
    public const CONTENT_BLOCK_PRE_DELETE  = 'mautic.content_block.pre_delete';
    public const CONTENT_BLOCK_POST_DELETE = 'mautic.content_block.post_delete';
}
