<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\DTO;

interface SerializableDtoInterface
{
    public function toArray(): array;
}
