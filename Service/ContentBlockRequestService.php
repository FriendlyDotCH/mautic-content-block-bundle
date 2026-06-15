<?php

namespace MauticPlugin\MauticContentBlockBundle\Service;

use Mautic\CoreBundle\Helper\InputHelper;
use MauticPlugin\MauticContentBlockBundle\DTO\AddBlockRequest;
use MauticPlugin\MauticContentBlockBundle\Entity\ContentBlockRepository;
use MauticPlugin\MauticContentBlockBundle\Exception\AjaxException;
use MauticPlugin\MauticContentBlockBundle\Exception\ApiErrors;
use Symfony\Contracts\Translation\TranslatorInterface;

class ContentBlockRequestService
{
    public function __construct(
        private readonly TranslatorInterface $translator,
        private readonly ContentBlockRepository $contentBlockRepository,
    ) {
    }

    public function parseAddBlockPayload(string $payload): AddBlockRequest
    {
        $data = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);

        $name        = trim(InputHelper::string((string) ($data['name'] ?? '')));
        $htmlContent = trim((string) ($data['htmlContent'] ?? ''));
        $iconRaw     = (string) ($data['icon'] ?? '');
        $icon        = mb_substr(strip_tags($iconRaw), 0, 20) ?: null;

        $addBlockRequest = (new AddBlockRequest())
                ->setName($name)
                ->setHtmlContent($htmlContent)
                ->setIcon($icon);

        return $addBlockRequest;
    }

    public function validateAddBlockPayload(AddBlockRequest $dto, ?int $excludeId = null): void
    {
        if (empty($dto->getName()) || strlen($dto->getName()) > 100) {
            throw new AjaxException(ApiErrors::CONTENT_BLOCK_VALIDATION_ERROR, $this->translator->trans('mautic.contentblock.validation.name_required'));
        }

        if ($this->contentBlockRepository->nameExists($dto->getName(), $excludeId)) {
            throw new AjaxException(ApiErrors::CONTENT_BLOCK_VALIDATION_ERROR, $this->translator->trans('mautic.contentblock.validation.name_not_unique'));
        }

        if (empty($dto->getHtmlContent()) || strlen($dto->getHtmlContent()) > 30000) {
            throw new AjaxException(ApiErrors::CONTENT_BLOCK_VALIDATION_ERROR, $this->translator->trans('mautic.contentblock.validation.html_required'));
        }
    }
}
