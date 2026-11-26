<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Entity;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\ORM\Query\Expr\Join;
use Mautic\CoreBundle\Entity\CommonRepository;
use Mautic\EmailBundle\Entity\Email;
use MauticPlugin\GrapesJsBuilderBundle\Entity\GrapesJsBuilder;

/**
 * @extends CommonRepository<ContentBlock>
 */
class ContentBlockRepository extends CommonRepository
{
    /**
     * @param array<string, mixed> $args
     */
    public function getEntities(array $args = [])
    {
        $q = $this->_em
            ->createQueryBuilder()
            ->select($this->getTableAlias().', cat')
            ->from(ContentBlock::class, $this->getTableAlias())
            ->leftJoin($this->getTableAlias().'.category', 'cat');

        $args['qb'] = $q;

        return parent::getEntities($args);
    }

    public function getTableAlias(): string
    {
        return 'cb';
    }

    public function nameExists(string $name, ?int $excludeId = null): bool
    {
        $qb = $this->createQueryBuilder('cb')
            ->select('1')
            ->where('cb.name = :name')
            ->setParameter('name', $name)
            ->setMaxResults(1);

        if (null !== $excludeId) {
            $qb->andWhere('cb.id != :excludeId')
                ->setParameter('excludeId', $excludeId);
        }

        return (bool) $qb->getQuery()->getOneOrNullResult();
    }

    /**
     * Every published linked block, as plain rows. One query per sending process.
     *
     * @return array<int, array{id: int, name: string, icon: ?string, compiled_html: string}>
     */
    public function getPublishedLinked(): array
    {
        $rows = $this->createQueryBuilder('cb')
            ->select('cb.id, cb.name, cb.icon, cb.compiledHtml')
            ->where('cb.linked = :linked')
            ->andWhere('cb.isPublished = :published')
            ->setParameter('linked', true)
            ->setParameter('published', true)
            ->getQuery()
            ->getArrayResult();

        return array_map(static fn (array $row): array => [
            'id'            => (int) $row['id'],
            'name'          => (string) $row['name'],
            'icon'          => null !== $row['icon'] && '' !== $row['icon'] ? (string) $row['icon'] : null,
            'compiled_html' => (string) ($row['compiledHtml'] ?? ''),
        ], $rows);
    }

    /**
     * Emails whose stored content references this block, so deleting or unpublishing it
     * can say what would break. Matches the compiled HTML and the builder's MJML.
     *
     * @return array<int, array{id: int, name: string, published: bool, type: string}>
     */
    public function findEmailsUsingBlock(int $blockId): array
    {
        return $this->findEmailsUsingBlocks([$blockId])[$blockId] ?? [];
    }

    /**
     * Same lookup for several blocks in one query (the list page), keyed by block id.
     * Blocks no email references are absent from the result.
     *
     * @param int[] $blockIds
     *
     * @return array<int, array<int, array{id: int, name: string, published: bool, type: string}>>
     */
    public function findEmailsUsingBlocks(array $blockIds): array
    {
        $blockIds = array_values(array_unique(array_map('intval', $blockIds)));
        if ([] === $blockIds) {
            return [];
        }

        $token = "CONCAT('%{contentblock=', cb.id, '}%')";

        $rows = $this->_em->createQueryBuilder()
            ->select('DISTINCT cb.id AS block_id, e.id, e.name, e.isPublished AS is_published, e.emailType AS email_type')
            ->from(Email::class, 'e')
            ->leftJoin(GrapesJsBuilder::class, 'g', Join::WITH, 'g.email = e')
            ->innerJoin(ContentBlock::class, 'cb', Join::WITH, 'cb.id IN (:ids)')
            ->where('e.customHtml LIKE '.$token.' OR g.customMjml LIKE '.$token)
            ->setParameter('ids', $blockIds, ArrayParameterType::INTEGER)
            ->orderBy('e.name')
            ->getQuery()
            ->getArrayResult();

        $byBlock = [];
        foreach ($rows as $row) {
            $byBlock[(int) $row['block_id']][] = [
                'id'        => (int) $row['id'],
                'name'      => (string) $row['name'],
                'published' => (bool) $row['is_published'],
                'type'      => (string) $row['email_type'],
            ];
        }

        return $byBlock;
    }
}
