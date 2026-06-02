using System;
using Server.Api.Data.Entities;

namespace Server.Api.Services;

public sealed record AuthenticatedSession(
    string AccessToken,
    DateTimeOffset ExpiresAtUtc,
    UserEntity User);
