<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Exception;

final class ApiErrors
{
    public const UNKNOWN_ERROR                  = 'unknown_error';
    public const CONTENT_BLOCK_SAVE_ERROR       = 'content_block_save_error';
    public const CONTENT_BLOCK_VALIDATION_ERROR = 'content_block_validation_error';
}
