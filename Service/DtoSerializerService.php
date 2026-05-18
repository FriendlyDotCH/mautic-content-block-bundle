<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Service;

use MauticPlugin\MauticContentBlockBundle\DTO\ContentBlockDto;

class DtoSerializerService
{
    /**
     * @param ContentBlockDto[] $dtos
     */
    public function serializeCollection(array $dtos): array
    {
        return array_map(fn (ContentBlockDto $dto) => $dto->toArray(), $dtos);
    }

    public function serialize(ContentBlockDto $dto): array
    {
        return $dto->toArray();
    }
}
