<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\EventListener;

use Mautic\EmailBundle\EmailEvents;
use Mautic\EmailBundle\Entity\Email;
use Mautic\EmailBundle\Event\EmailBuilderEvent;
use Mautic\EmailBundle\Event\EmailSendEvent;
use MauticPlugin\MauticContentBlockBundle\Service\ContentBlockTokenReplacer;
use MauticPlugin\MauticContentBlockBundle\Service\LinkedBlockResolver;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Injects linked blocks into outgoing email.
 *
 * Note on the archive: Mautic stores the sent body in `email_copies` and the web view of a
 * sent email renders from that copy without re-dispatching EMAIL_ON_DISPLAY. Because we
 * resolve during EMAIL_ON_SEND, the block's HTML is baked into that copy - so the web view
 * of an old email keeps showing the version that was actually sent, even after the block
 * is edited. EMAIL_ON_DISPLAY only drives previews, which should show the current version.
 */
class EmailSubscriber implements EventSubscriberInterface
{
    /**
     * Must run before:
     *  - TokenSubscriber::decodeTokens (254)        -> tokens inside a block ({contactfield=...}, {unsubscribe_url}) get replaced
     *  - BuilderSubscriber::convertUrlsToTokens (-9999) -> links inside a block get click tracking
     * Runs after fixEmailAccessibility (10000), which does not touch tokens.
     */
    public const PRIORITY = 300;

    /**
     * Missing ids already logged in this process (key: emailId|blockId), so a broadcast to
     * 100k contacts logs once rather than 100k times.
     *
     * @var array<string, true>
     */
    private array $loggedMissing = [];

    public function __construct(
        private LinkedBlockResolver $resolver,
        private ContentBlockTokenReplacer $replacer,
        private LoggerInterface $mauticLogger
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            EmailEvents::EMAIL_ON_BUILD   => ['onEmailBuild', 0],
            // Sending (per recipient; content is reset by MailHelper before every dispatch)
            EmailEvents::EMAIL_ON_SEND    => ['onEmailGenerate', self::PRIORITY],
            // Preview and dynamic content variants
            EmailEvents::EMAIL_ON_DISPLAY => ['onEmailGenerate', self::PRIORITY],
        ];
    }

    public function onEmailBuild(EmailBuilderEvent $event): void
    {
        if ($event->tokensRequested('{contentblock=')) {
            $event->addTokens($event->filterTokens($this->resolver->getBuilderTokens()));
        }
    }

    public function onEmailGenerate(EmailSendEvent $event): void
    {
        $html      = (string) $event->getContent();
        $plainText = (string) $event->getPlainText();

        $htmlHasTokens  = $this->replacer->hasTokens($html);
        $plainHasTokens = $this->replacer->hasTokens($plainText);

        // Fast exit for the common case: an email with no linked blocks costs one strpos.
        if (!$htmlHasTokens && !$plainHasTokens) {
            return;
        }

        $missing = [];

        // Plain text first: setContent() regenerates plain text only while it is still empty.
        if ($plainHasTokens) {
            $event->setPlainText($this->replacer->replace(
                $plainText,
                fn (int $id): ?string => $this->resolver->resolveText($id),
                $missing
            ));
        }

        if ($htmlHasTokens) {
            $event->setContent($this->replacer->replace(
                $html,
                fn (int $id): ?string => $this->resolver->resolveHtml($id),
                $missing
            ));
        }

        if ([] !== $missing) {
            $this->logMissing($event, array_values(array_unique($missing)));
        }
    }

    /**
     * Logged as an error on purpose: Mautic's prod logger only writes warnings when an error
     * follows, and an email going out without its footer is a content defect someone must see.
     *
     * @param list<int> $ids
     */
    private function logMissing(EmailSendEvent $event, array $ids): void
    {
        $email   = $event->getEmail();
        $emailId = $email instanceof Email ? $email->getId() : null;

        $new = array_values(array_filter($ids, function (int $id) use ($emailId): bool {
            $key = $emailId.'|'.$id;
            if (isset($this->loggedMissing[$key])) {
                return false;
            }
            $this->loggedMissing[$key] = true;

            return true;
        }));

        if ([] === $new) {
            return;
        }

        $this->mauticLogger->error(
            '[ContentBlocks] Unknown, unpublished or non-linked block token(s) were replaced with an empty string.',
            ['block_ids' => $new, 'email_id' => $emailId]
        );
    }
}
