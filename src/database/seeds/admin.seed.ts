import { Seeder } from 'typeorm-extension';

export default class AdminSeed implements Seeder {
  async run(dataSource: import('typeorm').DataSource): Promise<void> {
    console.log("Seed runing")
    const adminEmail = 'craftnotion@gmail.com';
    const adminPassword = 'Craftnotion@123';
    const userRepository = dataSource.getRepository('users');
    
    const adminExists = await userRepository.findOne({
      where: { email: adminEmail },
    });

    if (!adminExists) {
      const adminUser = userRepository.create({
        full_name: 'Admin',
        slug: 'admin-user',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        status: 'active',
      });
      await userRepository.save(adminUser);
      console.log('Admin user created with email:', adminEmail);
    } else {
      console.log('Admin user already exists with email:', adminEmail);
    }
  }
}
