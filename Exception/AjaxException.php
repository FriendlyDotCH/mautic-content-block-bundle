<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Exception;

class AjaxException extends \RuntimeException
{
    public function __construct(
        private readonly string $errorCode,
        private readonly string $description,
    ) {
        parent::__construct($description);
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function getDescription(): string
    {
        return $this->description;
    }
}
