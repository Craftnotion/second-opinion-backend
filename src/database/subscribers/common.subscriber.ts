import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  LoadEvent,
  RemoveEvent,
  UpdateEvent,
  Like,
} from 'typeorm';
import slugify from 'slugify';
import * as config from 'config';
import { ConfigObject } from '@nestjs/config';
import { FileService } from 'src/services/file/file.service';
import { DateTime, Duration } from 'luxon';

const dbConfig = config.get<ConfigObject>('app');
@EventSubscriber()
export class CommonSubscriber implements EntitySubscriberInterface<any> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly fileService: FileService,
  ) {
    this.dataSource.subscribers.push(this);
  }

  getSlugBase(entity: any) {
    return (
      entity?.title ||
      entity?.name ||
      entity?.full_name ||
      entity?.email?.split('@')[0] ||
      'user'
    );
  }

  async beforeInsert(event: InsertEvent<any>) {
    // console.log('event',event)
    if (!event?.entity) return;

    const columns = event.metadata.columns.map((col) => col.propertyName);

    if (columns.includes('slug')) {
      event.entity.slug = await this.createSlug(event);
    }
    if (columns.includes('avatar') && typeof event.entity.avatar === 'object') {
      event.entity.avatar = await this.fileService.saveFile(
        event.entity.avatar,
        event.entity.avatar_path,
      );
    }

    this.cleanEntity(event.entity);
  }

  async beforeUpdate(event: UpdateEvent<any>) {
    if (!event?.entity) return;

    const columns = event.metadata.columns.map((col) => col.propertyName);

    if (
      columns.includes('slug') &&
      (event.entity.full_name !== event.databaseEntity?.full_name ||
        event.entity.title !== event.databaseEntity?.title)
    ) {
      event.entity.slug = await this.createSlug(event);
    }

    if (!columns.includes('avatar')) return;

    if (
      event?.entity?.avatar &&
      event?.entity?.avatar !== event?.databaseEntity?.avatar
    ) {
      await this.deleteFile(event?.databaseEntity?.avatar);
    }

    if (typeof event?.entity?.avatar === 'object') {
      event.entity.avatar = await this.fileService.saveFile(
        event.entity.avatar,
        event.entity.avatar_path,
      );
    }

    this.cleanEntity(event.entity);
  }

  async afterInsert(event: InsertEvent<any>) {
    const columns = event.metadata.columns.map((col) => col.propertyName);

    if (columns.includes('slug')) {
      const slugBase = this.getSlugBase(event.entity);
      const newSlug = slugify(`${slugBase}-${event.entity.id}`, {
        lower: true,
      });

      await event.manager
        .getRepository(event.metadata.target)
        .update({ id: event.entity.id }, { slug: newSlug });

      event.entity.slug = newSlug;
    }

    if (columns.includes('avatar')) {
      await this.handleImageProcessing(event.entity);
    }
  }

  async afterUpdate(event: UpdateEvent<any>) {
    if (!event?.entity) return;

    const columns = event.metadata.columns.map((col) => col.propertyName);

    if (!columns.includes('avatar')) return;

    event.entity.PRIVATE_FILE = event?.databaseEntity?.PRIVATE_FILE;
    await this.handleImageProcessing(event.entity);
  }

  async afterRemove(event: RemoveEvent<any>) {
    const columns = event.metadata.columns.map((col) => col.propertyName);
    if (!columns.includes('avatar')) return;

    if (typeof event?.entity?.avatar === 'string') {
      await this.deleteFile(event.entity.avatar);
    }
  }

  async afterLoad(entity: any, event: LoadEvent<any>) {
    const columns = event.metadata.columns.map((col) => col.propertyName);
    if (!columns.includes('avatar')) return;
    await this.handleImageProcessing(entity);
    if (columns.includes('dob')) {
      const date = entity?.dob?.toISOString().split('T')[0];
      entity.dob = date;
      return date;
    }

    for (let column of columns) {
      if (
        (column.includes('_date') ||
          column.includes('_at') ||
          column.includes('claimed_on')) &&
        entity[column]
      ) {
        const date = DateTime.fromJSDate(entity[column]);
        const dayWithOrdinal = date.day + this.getOrdinalSuffix(date.day);
        entity[`$formatted_${column}`] =
          `${dayWithOrdinal} ${date.toFormat(config.get<string>('date_format') || 'LLL yy')}`;
      }

      if (column.includes('_time') && entity[column]) {
        const time = DateTime.fromFormat(entity[column], 'HH:mm:ss');
        entity[`$formatted_${column}`] = time.toFormat('hh:mm a');
      }

      if (column.includes('duration') && entity[column]) {
        const parts = entity[column].split(':');
        const hours = Number(parts[0] || 0);
        const minutes = Number(parts[1] || 0);
        const seconds = Number(parts[2] || 0);

        const duration = Duration.fromObject({
          hours: Number.isFinite(hours) ? hours : 0,
          minutes: Number.isFinite(minutes) ? minutes : 0,
          seconds: Number.isFinite(seconds) ? seconds : 0,
        });

        entity[`$formatted_${column}`] =
          `${duration.hours}h ${duration.minutes}m`;
      }
      if (column.includes('avgWorkHrs') && entity[column]) {
        const parts = entity[column].split(':');
        const hours = Number(parts[0] || 0);
        const minutes = Number(parts[1] || 0);
        const seconds = Number(parts[2] || 0);

        const duration = Duration.fromObject({
          hours: Number.isFinite(hours) ? hours : 0,
          minutes: Number.isFinite(minutes) ? minutes : 0,
          seconds: Number.isFinite(seconds) ? seconds : 0,
        });

        entity[`$formatted_${column}`] =
          `${duration.hours}h ${duration.minutes}m`;
      }
      if (column.includes('status') && entity[column]) {
        entity[column] = entity[column].replace('_', ' ');
      }
    }
  }

  getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th'; // 4th - 20th are always 'th'
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }

  cleanEntity(entity: any) {
    [
      '\$avatar_path',
      '\$avatar_url',
      '\$avatar_default',
      '\$private_file',
    ].forEach((key) => delete entity[key]);
    return entity;
  }

  async deleteFile(image?: string | null | Express.Multer.File) {
    if (image && typeof image === 'string') {
      await this.fileService.destroyFile(image);
    }
  }

  async handleImageProcessing(entity: any) {
    if (!entity.avatar) {
      entity.avatar_url = null;
      return;
    }

    const diskType = 'local';
    const appUrl = dbConfig.local; // Replace with your app URL

    if (diskType === 'local') {
      entity.avatar_url = `${appUrl}/${entity.avatar}`;
    }
  }

  async createSlug(
    event: InsertEvent<any> | UpdateEvent<any>,
  ): Promise<string> {
    const slugBase = this.getSlugBase(event.entity);
    let base = slugify(slugBase, { lower: true });

    const manager = this.dataSource.manager;

    const count = await manager.getRepository(event.metadata.target).count({
      where: { slug: Like(`${base}%`) },
    });

    if (count) {
      base = `${base}-${count}`;
    }

    return base;
  }
}
