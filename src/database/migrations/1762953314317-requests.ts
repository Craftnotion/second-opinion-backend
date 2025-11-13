import { MigrationInterface, QueryRunner } from "typeorm";

export class Requests1762953314317 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
     
        await queryRunner.dropColumn('users', 'last_name');
        
     
        await queryRunner.renameColumn('users', 'first_name', 'full_name');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
  
        await queryRunner.renameColumn('users', 'full_name', 'first_name');
        
      
    }

}