<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Entity;

use Mautic\CoreBundle\Entity\CommonRepository;

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
        $qb = $this->_em->getConnection()->createQueryBuilder();

        $rows = $qb->select('cb.id, cb.name, cb.icon, cb.compiled_html')
            ->from('friendly_content_blocks', 'cb')
            ->where('cb.is_linked = 1')
            ->andWhere('cb.is_published = 1')
            ->executeQuery()
            ->fetchAllAssociative();

        return array_map(static fn (array $row): array => [
            'id'            => (int) $row['id'],
            'name'          => (string) $row['name'],
            'icon'          => null !== $row['icon'] && '' !== $row['icon'] ? (string) $row['icon'] : null,
            'compiled_html' => (string) ($row['compiled_html'] ?? ''),
        ], $rows);
    }

    /**
     * Emails whose stored content references this block, so deleting or unpublishing it
     * can say what would break. Matches the compiled HTML and the builder's MJML.
     *
     * @return array<int, array{id: int, name: string}>
     */
    public function findEmailsUsingBlock(int $blockId): array
    {
        $token = '%{contentblock='.$blockId.'}%';
        $qb    = $this->_em->getConnection()->createQueryBuilder();

        return array_map(
            static fn (array $row): array => ['id' => (int) $row['id'], 'name' => (string) $row['name']],
            $qb->select('DISTINCT e.id, e.name')
                ->from('emails', 'e')
                ->leftJoin('e', 'bundle_grapesjsbuilder', 'g', 'g.email_id = e.id')
                ->where($qb->expr()->or(
                    $qb->expr()->like('e.custom_html', ':token'),
                    $qb->expr()->like('g.custom_mjml', ':token')
                ))
                ->setParameter('token', $token)
                ->executeQuery()
                ->fetchAllAssociative()
        );
    }
}
