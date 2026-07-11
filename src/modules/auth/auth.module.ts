import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthSocialService } from './auth-social.service';
import { AuthTokenService } from './auth-token.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AuthTokenService, AuthSocialService],
  exports: [AuthTokenService, AuthSocialService],
})
export class AuthModule {}
