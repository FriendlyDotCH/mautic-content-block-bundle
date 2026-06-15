<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Controller;

use Mautic\CoreBundle\Controller\AjaxController;
use Mautic\CoreBundle\Security\Permissions\CorePermissions;
use MauticPlugin\MauticContentBlockBundle\Exception\AjaxException;
use MauticPlugin\MauticContentBlockBundle\Exception\ApiErrors;
use MauticPlugin\MauticContentBlockBundle\Service\ContentBlockRequestService;
use MauticPlugin\MauticContentBlockBundle\Service\ContentBlockService;
use MauticPlugin\MauticContentBlockBundle\Service\DtoSerializerService;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ContentBlockGrapeController extends AjaxController
{
    public function __construct(
        private readonly ContentBlockService $contentBlockService,
        private readonly DtoSerializerService $contentBlockSerializer,
        private readonly LoggerInterface $mauticLogger,
        private readonly ContentBlockRequestService $contentBlockRequestService,
        CorePermissions $security,
    ) {
        $this->security = $security;
    }

    public function getBlocksAction(Request $request): Response
    {
        if (!$this->security->isGranted(['contentBlock:blocks:viewown', 'contentBlock:blocks:viewother'], 'MATCH_ONE')) {
            return $this->sendJsonResponse([
                'error'   => 'Access denied',
                'success' => false,
            ], Response::HTTP_FORBIDDEN);
        }

        try {
            $this->mauticLogger->info('method: getBlocksAction');
            $args                = [];
            $args['start']       = $request->request->get('start', 0);
            $args['limit']       = $request->request->get('limit', 100);
            $args['isPublished'] = $request->request->get('isPublished', true);

            $rows = $this->contentBlockService->getBlocks($args);
            $data = $this->contentBlockSerializer->serializeCollection($rows);

            return $this->sendJsonResponse([
                'blocks'  => $data,
                'success' => true,
            ]);
        } catch (AjaxException $e) {
            $this->mauticLogger->error($e->getTraceAsString());

            return $this->sendJsonResponse([
                'error'   => $e->getErrorCode(),
                'success' => false,
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        } catch (\Throwable $e) {
            $this->mauticLogger->error($e->getTraceAsString());

            return $this->sendJsonResponse([
                'error'   => ApiErrors::UNKNOWN_ERROR,
                'success' => false,
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function postBlockAction(Request $request): Response
    {
        if (!$this->security->isGranted(['contentBlock:blocks:create', 'contentBlock:blocks:full'], 'MATCH_ONE')) {
            return $this->sendJsonResponse([
                'error'   => 'Access denied',
                'success' => false,
            ], Response::HTTP_FORBIDDEN);
        }

        try {
            $this->mauticLogger->info('method: postBlockAction');

            $dto = $this->contentBlockRequestService->parseAddBlockPayload($request->getContent());
            $this->contentBlockRequestService->validateAddBlockPayload($dto);

            $this->contentBlockService->addBlock($dto);
            $data = $this->contentBlockSerializer->serialize($dto);

            return $this->sendJsonResponse([
                'block'   => $data,
                'success' => true,
            ], Response::HTTP_CREATED);
        } catch (AjaxException $e) {
            return $this->sendJsonResponse([
                'error'   => $e->getDescription(),
                'success' => false,
            ], Response::HTTP_BAD_REQUEST);
        } catch (\Throwable $e) {
            $this->mauticLogger->error('ContentBlock postBlock failed: '.$e->getMessage());

            return $this->sendJsonResponse([
                'error'   => ApiErrors::UNKNOWN_ERROR,
                'success' => false,
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function patchBlockAction(Request $request, int $id): Response
    {
        if (!$this->security->isGranted(['contentBlock:blocks:editown', 'contentBlock:blocks:editother', 'contentBlock:blocks:full'], 'MATCH_ONE')) {
            return $this->sendJsonResponse([
                'error'   => 'Access denied',
                'success' => false,
            ], Response::HTTP_FORBIDDEN);
        }

        try {
            $this->mauticLogger->info('method: patchBlockAction');

            $dto = $this->contentBlockRequestService->parseAddBlockPayload($request->getContent());
            $this->contentBlockRequestService->validateAddBlockPayload($dto, $id);

            $updated = $this->contentBlockService->updateBlock($id, $dto);

            if (null === $updated) {
                return $this->sendJsonResponse([
                    'error'   => ApiErrors::CONTENT_BLOCK_NOT_FOUND,
                    'success' => false,
                ], Response::HTTP_NOT_FOUND);
            }

            return $this->sendJsonResponse([
                'block'   => $this->contentBlockSerializer->serialize($updated),
                'success' => true,
            ]);
        } catch (AjaxException $e) {
            return $this->sendJsonResponse([
                'error'   => $e->getDescription(),
                'success' => false,
            ], Response::HTTP_BAD_REQUEST);
        } catch (\Throwable $e) {
            $this->mauticLogger->error('ContentBlock patchBlock failed: '.$e->getMessage());

            return $this->sendJsonResponse([
                'error'   => ApiErrors::UNKNOWN_ERROR,
                'success' => false,
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function deleteBlockAction(Request $request, int $id): Response
    {
        if (!$this->security->isGranted(['contentBlock:blocks:deleteown', 'contentBlock:blocks:deleteother', 'contentBlock:blocks:full'], 'MATCH_ONE')) {
            return $this->sendJsonResponse([
                'error'   => 'Access denied',
                'success' => false,
            ], Response::HTTP_FORBIDDEN);
        }

        try {
            $this->mauticLogger->info('method: deleteBlockAction');

            $deleted = $this->contentBlockService->deleteBlock($id);

            if (!$deleted) {
                return $this->sendJsonResponse([
                    'error'   => ApiErrors::CONTENT_BLOCK_NOT_FOUND,
                    'success' => false,
                ], Response::HTTP_NOT_FOUND);
            }

            return $this->sendJsonResponse([
                'id'      => $id,
                'success' => true,
            ]);
        } catch (\Throwable $e) {
            $this->mauticLogger->error('ContentBlock deleteBlock failed: '.$e->getMessage());

            return $this->sendJsonResponse([
                'error'   => ApiErrors::UNKNOWN_ERROR,
                'success' => false,
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
