using System.Collections.Generic;

namespace Shared.Models.Dtos;

public sealed class TransportOrderQueueResponse
{
    public List<TransportOrderDto> PendingOrders { get; set; } = [];
    public List<TransportOrderDto> RunningOrders { get; set; } = [];
}
