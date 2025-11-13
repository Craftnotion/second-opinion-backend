import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class Request1763034946020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'requests',
      new TableColumn({
        name: 'uid',
        type: 'varchar',
        isUnique: true,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
