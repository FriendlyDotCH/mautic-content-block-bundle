<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Exception;

class AjaxException extends \RuntimeException
{
    public function __construct(
        private readonly int $statusCode,
        private readonly string $description,
    ) {
        parent::__construct($description, $statusCode);
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getDescription(): string
    {
        return $this->description;
    }
}
