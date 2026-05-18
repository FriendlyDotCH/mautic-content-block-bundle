<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Controller;

use Mautic\CoreBundle\Controller\AjaxController;
use MauticPlugin\MauticContentBlockBundle\Exception\AjaxException;
use MauticPlugin\MauticContentBlockBundle\Exception\ApiErrors;
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
    ) {
    }

    public function getBlocksAction(Request $request): Response
    {
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
            return $this->sendJsonResponse([
                'error'   => ApiErrors::UNKNOWN_ERROR,
                'success' => false,
            ], Response::HTTP_BAD_REQUEST);
        } catch (\Throwable $e) {
            $this->mauticLogger->error('ContentBlock getBlocksAction failed: '.$e->getMessage());

            return $this->sendJsonResponse([
                'error'   => ApiErrors::UNKNOWN_ERROR,
                'success' => false,
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    public function postBlockAction(Request $request): Response
    {
        /**
         * @todo finish.
         */
        try {
            $this->mauticLogger->info('method: postBlockAction');
            $data = $request->request->all();
            /**
             * @todo convert to dto
             * validate dto
             * save
             */
            $this->contentBlockService->saveBlock($data);

            return $this->sendJsonResponse([
                'success' => true,
            ], Response::HTTP_CREATED);
        } catch (AjaxException $e) {
            return $this->sendJsonResponse([
                'error'   => ApiErrors::CONTENT_BLOCK_SAVE_ERROR,
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
}
