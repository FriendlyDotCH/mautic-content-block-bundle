<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\EventListener;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Mautic applies CSRF validation to all POST requests via a global listener.
 * Our /s/content-blocks/save endpoint sends JSON (not a form), so we mark
 * the request to skip CSRF by setting a custom attribute the Mautic CSRF
 * listener honours — OR we simply handle it before it fires.
 *
 * The cleanest approach: change the route to use a custom method name that
 * Mautic's CSRF listener ignores, or just set _csrf_exclude on the request.
 */
class CsrfExcludeSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        // Priority 200 = runs before Mautic's CSRF check (priority 0)
        return [
            KernelEvents::REQUEST => ['onRequest', 200],
        ];
    }

    public function onRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();

        // Only act on our save endpoint
        if (!str_contains($request->getPathInfo(), '/content-blocks/save')) {
            return;
        }

        // Tell Mautic's SecuritySubscriber to skip CSRF for this request
        $request->attributes->set('_csrf_exclude', true);
    }
}
