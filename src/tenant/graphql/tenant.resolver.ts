/**
 * @license GPL-3.0-or-later
 * Copyright (C) 2025 Caleb Gyamfi - Omnixys Technologies
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * For more information, visit <https://www.gnu.org/licenses/>.
 */

import { TenantWriteService } from '../domain/tenant-write.service.js';
import { TenantReadService } from '../domain/tenant-read.service.js';
import { Resolver, Query, Mutation, Parent, ResolveReference, Args, InputType, Field, ObjectType } from '@nestjs/graphql';
import { TenantStatus } from '../../prisma/generated/client.js';

@ObjectType()
class TenantType {
  @Field(() => String)
  id!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  createdAt?: string;

  @Field(() => String, { nullable: true })
  updatedAt?: string;
}

@InputType()
class CreateTenantInput {
  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field()
  createdBy!: string;
}

@InputType()
class UpdateTenantInput {
  @Field(() => String)
  id!: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  status?: TenantStatus;

  @Field()
  updatedBy!: string;
}

@InputType()
class DeleteTenantInput {
  @Field(() => String)
  id!: string;

  @Field()
  updatedBy!: string;
}

@Resolver(() => TenantType)
export class TenantResolver {
  constructor(
    private readonly tenantWriteService: TenantWriteService,
    private readonly tenantReadService: TenantReadService,
  ) {}

  @Query(() => TenantType)
  async getTenant(@Args('id') id: string): Promise<TenantType> {
    const tenant = await this.tenantReadService.getTenant(id);
    return this.#toTenantType(tenant);
  }

  @Query(() => [TenantType])
  async listTenants(
    @Args('status', { nullable: true }) status?: TenantStatus,
  ): Promise<TenantType[]> {
    const tenants = await this.tenantWriteService.listTenants({ status });
    return tenants.map(t => this.#toTenantType(t));
  }

  @Mutation(() => TenantType)
  async createTenant(
    @Args('input') input: CreateTenantInput,
  ): Promise<TenantType> {
    const tenant = await this.tenantWriteService.createTenant(input);
    return this.#toTenantType(tenant);
  }

  @Mutation(() => TenantType)
  async updateTenant(
    @Args('input') input: UpdateTenantInput,
  ): Promise<TenantType> {
    const tenant = await this.tenantWriteService.updateTenant(input);
    return this.#toTenantType(tenant);
  }

  @Mutation(() => Boolean)
  async deleteTenant(
    @Args('input') input: DeleteTenantInput,
  ): Promise<boolean> {
    return this.tenantWriteService.deleteTenant(input);
  }

  @ResolveReference()
  async resolveReference(
    @Parent() reference: { id: string },
  ): Promise<TenantType> {
    const tenant = await this.tenantReadService.getTenant(reference.id);
    return this.#toTenantType(tenant);
  }

  #toTenantType(tenant: { id: string; name: string; slug: string; status: string; createdAt?: Date; updatedAt?: Date }): TenantType {
    const result = new TenantType();
    result.id = tenant.id;
    result.name = tenant.name;
    result.slug = tenant.slug;
    result.status = tenant.status;
    result.createdAt = tenant.createdAt?.toISOString();
    result.updatedAt = tenant.updatedAt?.toISOString();
    return result;
  }
}