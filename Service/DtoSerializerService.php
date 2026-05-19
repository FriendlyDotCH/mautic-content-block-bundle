<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Service;

use MauticPlugin\MauticContentBlockBundle\DTO\ContentBlockDto;
use MauticPlugin\MauticContentBlockBundle\DTO\SerializableDtoInterface;

class DtoSerializerService
{
    /**
     * @param ContentBlockDto[] $dtos
     */
    public function serializeCollection(array $dtos): array
    {
        return array_map(fn (SerializableDtoInterface $dto) => $dto->toArray(), $dtos);
    }

    public function serialize(SerializableDtoInterface $dto): array
    {
        return $dto->toArray();
    }
}
