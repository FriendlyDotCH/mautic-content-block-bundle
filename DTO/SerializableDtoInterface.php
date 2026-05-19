<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\DTO;

interface SerializableDtoInterface
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(): array;
}
